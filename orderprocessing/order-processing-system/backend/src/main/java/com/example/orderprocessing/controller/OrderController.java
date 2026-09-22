package com.example.orderprocessing.controller;

import com.example.orderprocessing.entity.DeadLetterOrder;
import com.example.orderprocessing.entity.Inventory;
import com.example.orderprocessing.entity.OrderRecord;
import com.example.orderprocessing.service.OrderService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class OrderController {

    private final OrderService orderService;

    @PostMapping("/orders/place")
    public ResponseEntity<OrderRecord> placeOrder(@RequestBody OrderRequest request) {
        if (request.getItemName() == null || request.getItemName().isBlank()) {
            return ResponseEntity.badRequest().build();
        }
        if (request.getQuantity() <= 0) {
            return ResponseEntity.badRequest().build();
        }
        OrderRecord order = orderService.placeOrder(request.getItemName(), request.getQuantity());
        return ResponseEntity.ok(order);
    }

    @PostMapping("/orders/simulate-surge")
    public ResponseEntity<Map<String, Object>> simulateSurge(
            @RequestParam(defaultValue = "Laptop") String itemName,
            @RequestParam(defaultValue = "1") int quantity,
            @RequestParam(defaultValue = "50") int concurrentOrders) {

        orderService.simulateSurge(itemName, quantity, concurrentOrders);
        return ResponseEntity.ok(Map.of(
                "message", "Surge of " + concurrentOrders + " concurrent orders submitted",
                "itemName", itemName,
                "quantityPerOrder", quantity
        ));
    }

    @GetMapping("/inventory")
    public ResponseEntity<List<Inventory>> getInventory() {
        return ResponseEntity.ok(orderService.getAllInventory());
    }

    @GetMapping("/orders")
    public ResponseEntity<List<OrderRecord>> getOrders() {
        return ResponseEntity.ok(orderService.getAllOrders());
    }

    @GetMapping("/dlq")
    public ResponseEntity<List<DeadLetterOrder>> getDlq() {
        return ResponseEntity.ok(orderService.getAllDlq());
    }

    @PostMapping("/inventory/reset")
    public ResponseEntity<Map<String, String>> resetInventory() {
        orderService.resetInventory();
        return ResponseEntity.ok(Map.of("message", "Inventory reset to defaults"));
    }
}
