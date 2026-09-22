package com.example.orderprocessing.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "order_records")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OrderRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String itemName;

    @Column(nullable = false)
    private int quantityRequested;

    @Column(nullable = false)
    private String status; // PENDING, COMPLETED, FAILED_DLQ

    @Column(nullable = false)
    private LocalDateTime timestamp;
}
