package com.example.orderprocessing.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "dead_letter_orders")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DeadLetterOrder {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String itemName;

    @Column(nullable = false)
    private int quantityRequested;

    @Column(nullable = false)
    private String failureReason;

    @Column(nullable = false)
    private LocalDateTime timestamp;
}
