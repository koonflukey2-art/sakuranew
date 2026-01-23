"use client";

import dynamic from "next/dynamic";
import OrdersLoading from "./_ui/OrdersLoading";

const OrdersClient = dynamic(() => import("./OrdersClient"), {
  ssr: false,
  loading: () => <OrdersLoading />,
});

export default function ClientOnlyOrders() {
  return <OrdersClient />;
}
