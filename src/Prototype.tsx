import { lazy, Suspense } from "react";
import { MagicWandIcon } from "@radix-ui/react-icons";
import { OperatingOSProvider, useOperatingOS } from "./features/shared/OperatingOSProvider";

const StoreManagerApp = lazy(() => import("./features/store-manager/StoreManagerApp"));
const RegionalManagerApp = lazy(() => import("./features/regional-manager/RegionalManagerApp"));
const HeadquartersApp = lazy(() => import("./features/headquarters/HeadquartersApp"));

function RoleApp() {
  const { state } = useOperatingOS();
  if (state.role === "regionalManager") return <RegionalManagerApp />;
  if (state.role === "headquarters") return <HeadquartersApp />;
  return <StoreManagerApp />;
}
function RoleLoading() {
  return (
    <div className="role-loading" role="status">
      <MagicWandIcon />
      <b>正在进入经营工作台</b>
      <span>三个角色共享同一套经营状态</span>
    </div>
  );
}

export default function Prototype() {
  return (
    <OperatingOSProvider>
      <Suspense fallback={<RoleLoading />}>
        <RoleApp />
      </Suspense>
    </OperatingOSProvider>
  );
}
