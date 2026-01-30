import { Suspense } from "react";
import ApproveDeviceClient from "./ApproveDeviceClient";

export default function Page() {
  return (
    <Suspense fallback={<div className="h-screen flex items-center justify-center">Loading...</div>}>
      <ApproveDeviceClient />
    </Suspense>
  );
}
