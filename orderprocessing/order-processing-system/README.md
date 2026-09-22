# Real-Time Order Processing System

A complete **Spring Boot + React** order processing system with:

- Concurrent order processing via thread pool
- **Pessimistic write locking** to prevent overselling / negative stock
- Bounded retry mechanism
- Dead Letter Queue (DLQ) for failed orders
- Real-time WebSocket broadcasts (STOMP over SockJS)
- Futuristic dark-mode React dashboard (Tailwind + Lucide)

---

## Architecture

```
┌─────────────────┐     WebSocket      ┌──────────────────────┐
│  React Dashboard│◄──────────────────►│  Spring Boot Backend │
│  (Tailwind UI)  │   /topic/* topics  │  + Thread Pool       │
└────────┬────────┘                    │  + Pessimistic Lock  │
         │ REST                        │  + H2 / MySQL        │
         └────────────────────────────►└──────────────────────┘
```

### Key Features

| Feature | Implementation |
|---------|----------------|
| Concurrency | Fixed thread pool (20 workers) |
| Stock safety | `@Lock(PESSIMISTIC_WRITE)` on inventory lookup |
| Retry | Bounded (max 3 attempts) with short backoff |
| Failure handling | Orders routed to `DeadLetterOrder` table + `/topic/dlq` |
| Real-time | `SimpMessagingTemplate` → `/topic/inventory`, `/topic/orders`, `/topic/dlq` |
| Surge test | `POST /api/orders/simulate-surge` fires 50 concurrent threads |

---

## Prerequisites

- **Java 17+**
- **Maven 3.8+**
- **Node.js 18+** & npm
- (Optional) MySQL 8 if you prefer it over the default H2 in-memory DB

---

## Quick Start

### 1. Backend

```bash
cd backend
mvn spring-boot:run
```

Backend starts on **http://localhost:8080**

- H2 console: http://localhost:8080/h2-console  
  (JDBC URL: `jdbc:h2:mem:orderdb`, user: `sa`, password: empty)

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

Dashboard opens at **http://localhost:5173**

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/orders/place` | Place a single order `{ "itemName": "Laptop", "quantity": 1 }` |
| POST | `/api/orders/simulate-surge?itemName=Laptop&quantity=1&concurrentOrders=50` | Fire concurrent orders |
| GET | `/api/inventory` | Current stock levels |
| GET | `/api/orders` | All order records |
| GET | `/api/dlq` | Dead-letter queue entries |
| POST | `/api/inventory/reset` | Reset stock to defaults |

### WebSocket

- Endpoint: `ws://localhost:8080/ws` (SockJS)
- Topics:
  - `/topic/inventory` – stock updates
  - `/topic/orders` – order status changes
  - `/topic/dlq` – new DLQ entries

---

## Switching to MySQL

Edit `backend/src/main/resources/application.properties`:

```properties
# Comment out H2 section and uncomment MySQL:
spring.datasource.url=jdbc:mysql://localhost:3306/orderdb?createDatabaseIfNotExist=true&useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=UTC
spring.datasource.username=root
spring.datasource.password=yourpassword
spring.datasource.driver-class-name=com.mysql.cj.jdbc.Driver
```

Then restart the backend.

---

## How Concurrency Safety Works

1. Each order processing attempt runs inside a short Spring transaction.
2. Inventory is loaded with `SELECT … FOR UPDATE` (pessimistic write lock).
3. Stock is checked and decremented atomically.
4. If stock is insufficient → order is marked `FAILED_DLQ` and a `DeadLetterOrder` is persisted.
5. Transient errors are retried up to 3 times with linear backoff.
6. All state changes are immediately broadcast over WebSocket.

This guarantees **no overselling** even under a 50-thread flash surge.

---

## Project Structure

```
order-processing-system/
├── backend/                 # Spring Boot 3.2
│   ├── src/main/java/...
│   │   ├── config/          # WebSocket, CORS, ThreadPool, Transaction
│   │   ├── controller/
│   │   ├── entity/
│   │   ├── repository/
│   │   └── service/
│   └── pom.xml
├── frontend/                # React + Vite + Tailwind
│   ├── src/
│   │   ├── components/      # (inline in App)
│   │   ├── hooks/useWebSocket.js
│   │   └── App.jsx
│   └── package.json
└── README.md
```

---

## License

MIT – free to use and modify.
