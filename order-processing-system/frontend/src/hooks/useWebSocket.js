import { useEffect, useRef, useState, useCallback } from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

const WS_URL = 'http://localhost:8080/ws';

export function useWebSocket() {
  const [connected, setConnected] = useState(false);
  const [inventory, setInventory] = useState([]);
  const [orders, setOrders] = useState([]);
  const [dlq, setDlq] = useState([]);
  const clientRef = useRef(null);

  const connect = useCallback(() => {
    if (clientRef.current?.active) return;

    const client = new Client({
      webSocketFactory: () => new SockJS(WS_URL),
      reconnectDelay: 3000,
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,
      onConnect: () => {
        console.log('STOMP connected');
        setConnected(true);

        client.subscribe('/topic/inventory', (msg) => {
          const item = JSON.parse(msg.body);
          setInventory((prev) => {
            const idx = prev.findIndex((i) => i.id === item.id);
            if (idx >= 0) {
              const next = [...prev];
              next[idx] = { ...item, _flash: Date.now() };
              return next;
            }
            return [...prev, { ...item, _flash: Date.now() }];
          });
        });

        client.subscribe('/topic/orders', (msg) => {
          const order = JSON.parse(msg.body);
          setOrders((prev) => {
            const idx = prev.findIndex((o) => o.id === order.id);
            if (idx >= 0) {
              const next = [...prev];
              next[idx] = order;
              return next;
            }
            return [order, ...prev].slice(0, 200); // keep latest 200
          });
        });

        client.subscribe('/topic/dlq', (msg) => {
          const item = JSON.parse(msg.body);
          setDlq((prev) => [item, ...prev].slice(0, 100));
        });
      },
      onDisconnect: () => {
        console.log('STOMP disconnected');
        setConnected(false);
      },
      onStompError: (frame) => {
        console.error('STOMP error', frame);
      },
    });

    client.activate();
    clientRef.current = client;
  }, []);

  useEffect(() => {
    connect();
    return () => {
      if (clientRef.current) {
        clientRef.current.deactivate();
      }
    };
  }, [connect]);

  // Initial data fetch
  useEffect(() => {
    const fetchInitial = async () => {
      try {
        const [invRes, ordRes, dlqRes] = await Promise.all([
          fetch('http://localhost:8080/api/inventory'),
          fetch('http://localhost:8080/api/orders'),
          fetch('http://localhost:8080/api/dlq'),
        ]);
        if (invRes.ok) setInventory(await invRes.json());
        if (ordRes.ok) {
          const data = await ordRes.json();
          setOrders(data.reverse()); // newest first
        }
        if (dlqRes.ok) {
          const data = await dlqRes.json();
          setDlq(data.reverse());
        }
      } catch (e) {
        console.warn('Initial fetch failed (backend may be starting)', e);
      }
    };
    fetchInitial();
  }, []);

  return { connected, inventory, orders, dlq, setInventory, setOrders, setDlq };
}
