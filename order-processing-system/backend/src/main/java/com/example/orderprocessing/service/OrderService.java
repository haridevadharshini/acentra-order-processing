package com.example.orderprocessing.service;

import com.example.orderprocessing.entity.DeadLetterOrder;
import com.example.orderprocessing.entity.Inventory;
import com.example.orderprocessing.entity.OrderRecord;
import com.example.orderprocessing.repository.DeadLetterOrderRepository;
import com.example.orderprocessing.repository.InventoryRepository;
import com.example.orderprocessing.repository.OrderRecordRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;

import java.time.LocalDateTime;
import java.util.List;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.atomic.AtomicInteger;

@Service
@RequiredArgsConstructor
@Slf4j
public class OrderService {

    private final InventoryRepository inventoryRepository;
    private final OrderRecordRepository orderRecordRepository;
    private final DeadLetterOrderRepository deadLetterOrderRepository;
    private final SimpMessagingTemplate messagingTemplate;
    private final ExecutorService orderProcessingExecutor;
    private final TransactionTemplate transactionTemplate;

    private static final int MAX_RETRIES = 3;

    /**
     * Place a single order.
     * Uses TransactionTemplate + pessimistic locking to prevent overselling.
     */
    public OrderRecord placeOrder(String itemName, int quantity) {
        log.info("Placing order for {} x {}", quantity, itemName);

        // Persist PENDING order outside the critical section
        OrderRecord order = OrderRecord.builder()
                .itemName(itemName)
                .quantityRequested(quantity)
                .status("PENDING")
                .timestamp(LocalDateTime.now())
                .build();
        order = orderRecordRepository.save(order);
        broadcastOrder(order);

        try {
            processOrderWithRetry(order);
        } catch (Exception e) {
            log.error("Order {} failed permanently: {}", order.getId(), e.getMessage());
            routeToDlq(order, e.getMessage());
        }

        return orderRecordRepository.findById(order.getId()).orElse(order);
    }

    /**
     * Core processing with bounded retry.
     * Each attempt runs inside its own short transaction with pessimistic lock.
     */
    private void processOrderWithRetry(OrderRecord order) {
        int attempts = 0;
        Exception lastException = null;

        while (attempts < MAX_RETRIES) {
            attempts++;
            try {
                final int attempt = attempts;
                Boolean success = transactionTemplate.execute(status -> {
                    Inventory inv = inventoryRepository.findByItemNameForUpdate(order.getItemName())
                            .orElseThrow(() -> new InsufficientStockException("Item not found: " + order.getItemName()));

                    if (inv.getStockQuantity() < order.getQuantityRequested()) {
                        throw new InsufficientStockException(
                                String.format("Insufficient stock for %s. Available: %d, Requested: %d",
                                        order.getItemName(), inv.getStockQuantity(), order.getQuantityRequested()));
                    }

                    inv.setStockQuantity(inv.getStockQuantity() - order.getQuantityRequested());
                    inventoryRepository.save(inv);
                    broadcastInventory(inv);

                    order.setStatus("COMPLETED");
                    orderRecordRepository.save(order);
                    broadcastOrder(order);

                    log.info("Order {} COMPLETED after {} attempt(s). Remaining stock for {}: {}",
                            order.getId(), attempt, inv.getItemName(), inv.getStockQuantity());
                    return true;
                });

                if (Boolean.TRUE.equals(success)) {
                    return;
                }
            } catch (InsufficientStockException e) {
                lastException = e;
                log.warn("Order {} attempt {} failed (no stock): {}", order.getId(), attempts, e.getMessage());
                // Permanent failure – no point retrying
                break;
            } catch (Exception e) {
                lastException = e;
                log.warn("Order {} attempt {} transient failure: {}", order.getId(), attempts, e.getMessage());
                try {
                    Thread.sleep(50L * attempts);
                } catch (InterruptedException ie) {
                    Thread.currentThread().interrupt();
                    break;
                }
            }
        }

        // Exhausted retries or permanent stock failure
        order.setStatus("FAILED_DLQ");
        orderRecordRepository.save(order);
        broadcastOrder(order);
        routeToDlq(order, lastException != null ? lastException.getMessage() : "Unknown failure");
    }

    private void routeToDlq(OrderRecord order, String reason) {
        DeadLetterOrder dlq = DeadLetterOrder.builder()
                .itemName(order.getItemName())
                .quantityRequested(order.getQuantityRequested())
                .failureReason(reason != null ? reason : "Unknown")
                .timestamp(LocalDateTime.now())
                .build();
        deadLetterOrderRepository.save(dlq);
        broadcastDlq(dlq);
        log.info("Order {} routed to DLQ: {}", order.getId(), reason);
    }

    /**
     * Simulate a flash traffic surge: fire N concurrent orders via the thread pool.
     */
    public void simulateSurge(String itemName, int quantityPerOrder, int concurrentOrders) {
        log.info("Simulating surge: {} concurrent orders for {} x {}", concurrentOrders, quantityPerOrder, itemName);

        for (int i = 0; i < concurrentOrders; i++) {
            orderProcessingExecutor.submit(() -> {
                try {
                    placeOrder(itemName, quantityPerOrder);
                } catch (Exception e) {
                    log.error("Surge order failed: {}", e.getMessage());
                }
            });
        }
    }

    // ---------- Broadcast helpers ----------

    public void broadcastInventory(Inventory inv) {
        messagingTemplate.convertAndSend("/topic/inventory", inv);
    }

    public void broadcastOrder(OrderRecord order) {
        messagingTemplate.convertAndSend("/topic/orders", order);
    }

    public void broadcastDlq(DeadLetterOrder dlq) {
        messagingTemplate.convertAndSend("/topic/dlq", dlq);
    }

    // ---------- Read / Admin APIs ----------

    public List<Inventory> getAllInventory() {
        return inventoryRepository.findAll();
    }

    public List<OrderRecord> getAllOrders() {
        return orderRecordRepository.findAll();
    }

    public List<DeadLetterOrder> getAllDlq() {
        return deadLetterOrderRepository.findAll();
    }

    @Transactional
    public void resetInventory() {
        inventoryRepository.deleteAll();
        Inventory laptop = Inventory.builder().itemName("Laptop").stockQuantity(100).build();
        Inventory phone = Inventory.builder().itemName("Phone").stockQuantity(200).build();
        Inventory headphones = Inventory.builder().itemName("Headphones").stockQuantity(150).build();
        Inventory tablet = Inventory.builder().itemName("Tablet").stockQuantity(80).build();
        inventoryRepository.saveAll(List.of(laptop, phone, headphones, tablet));
        getAllInventory().forEach(this::broadcastInventory);
        log.info("Inventory reset to defaults");
    }

    public static class InsufficientStockException extends RuntimeException {
        public InsufficientStockException(String message) {
            super(message);
        }
    }
}
