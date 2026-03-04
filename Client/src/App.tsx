import { Routes, Route } from "react-router-dom";
import CreditUI from "./Component/CreditUI";
import HomePage from "./Component/HomePage";

function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/dashboard" element={<CreditUI />} />
    </Routes>
  );
}

export default App;