/**
 * RequestTransportButton.jsx
 *
 * Drop this into your order confirmation / Orders table row.
 * When the buyer clicks it, a transportRequest document is written
 * to Firestore and ALL drivers see it live in their DriverDashboard.
 *
 * Usage:
 *   <RequestTransportButton order={order} />
 *
 * Required order shape (matches your INITIAL_ORDERS structure):
 * {
 *   id: "KRL-4418",
 *   listing: "200× Road Runners",
 *   qty: 50,
 *   amount: 400,
 *   location: "Masvingo",        ← seller / pickup location
 *   buyerLocation: "Harare",     ← add this field to your orders
 *   categoryId: "chicken",       ← optional, for emoji
 * }
 */

import { useState } from "react";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../lib/firebase";
import useAuthStore from "../store/useAuthStore";

export default function RequestTransportButton({ order }) {
  const { user } = useAuthStore();
  const [status, setStatus] = useState("idle"); // idle | loading | done | error

  const handleRequest = async () => {
    if (status !== "idle") return;
    setStatus("loading");

    try {
      await addDoc(collection(db, "transportRequests"), {
        orderId: order.id,
        listing: order.listing,
        qty: order.qty,
        amount: order.amount,
        categoryId: order.categoryId || "other",

        // Route
        pickupLocation: order.location, // seller location = pickup
        dropoffLocation: order.buyerLocation || "To be confirmed",

        // Parties
        sellerId: order.sellerId || null,
        buyerId: user?.uid || null,
        buyerName: user?.displayName || user?.email || "Buyer",

        // Transport fee (optional — set if your app calculates it)
        transportFee: order.transportFee || null,

        status: "open",
        acceptedBy: null,
        driverName: null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      setStatus("done");
    } catch (err) {
      console.error("Failed to create transport request:", err);
      setStatus("error");
    }
  };

  if (status === "done") {
    return (
      <span
        style={{
          fontSize: "12px",
          color: "#166534",
          background: "#d4f5e2",
          padding: "5px 12px",
          borderRadius: "20px",
          fontWeight: 500,
        }}
      >
        🚚 Transport requested
      </span>
    );
  }

  if (status === "error") {
    return (
      <button
        onClick={() => setStatus("idle")}
        style={{
          fontSize: "12px",
          color: "#991b1b",
          background: "#fee2e2",
          border: "none",
          padding: "5px 12px",
          borderRadius: "20px",
          cursor: "pointer",
        }}
      >
        ⚠️ Failed — retry
      </button>
    );
  }

  return (
    <button
      onClick={handleRequest}
      disabled={status === "loading"}
      style={{
        fontSize: "12px",
        color: "#fff",
        background: status === "loading" ? "#9ca3af" : "#a07850",
        border: "none",
        padding: "6px 14px",
        borderRadius: "8px",
        cursor: status === "loading" ? "not-allowed" : "pointer",
        fontWeight: 600,
        transition: "background 0.15s",
      }}
    >
      {status === "loading" ? "Requesting…" : "🚚 Request Transport"}
    </button>
  );
}
