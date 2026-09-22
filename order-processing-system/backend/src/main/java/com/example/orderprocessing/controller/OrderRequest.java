package com.example.orderprocessing.controller;

import lombok.Data;

@Data
public class OrderRequest {
    private String itemName;
    private int quantity;
}
