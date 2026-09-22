package com.example.orderprocessing;

import com.example.orderprocessing.entity.Inventory;
import com.example.orderprocessing.repository.InventoryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;

import java.util.List;

@SpringBootApplication
public class OrderProcessingApplication {

    public static void main(String[] args) {
        SpringApplication.run(OrderProcessingApplication.class, args);
    }

    @Bean
    CommandLineRunner initData(InventoryRepository inventoryRepository) {
        return args -> {
            if (inventoryRepository.count() == 0) {
                Inventory laptop = Inventory.builder().itemName("Laptop").stockQuantity(100).build();
                Inventory phone = Inventory.builder().itemName("Phone").stockQuantity(200).build();
                Inventory headphones = Inventory.builder().itemName("Headphones").stockQuantity(150).build();
                Inventory tablet = Inventory.builder().itemName("Tablet").stockQuantity(80).build();
                inventoryRepository.saveAll(List.of(laptop, phone, headphones, tablet));
                System.out.println(">>> Seeded default inventory");
            }
        };
    }
}
