import { MobileRuntime } from "./mobile";
import Prototype from "./Prototype";

export default function App() {
  return (
    <MobileRuntime presentation="direct">
      <Prototype />
    </MobileRuntime>
  );
}
