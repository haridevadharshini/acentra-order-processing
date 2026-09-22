package com.example.orderprocessing.repository;

import com.example.orderprocessing.entity.DeadLetterOrder;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface DeadLetterOrderRepository extends JpaRepository<DeadLetterOrder, Long> {
}
