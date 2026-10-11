import { Route, Routes } from "react-router-dom";
import { Home } from "./pages/Home";
import { FindMinyan } from "./pages/FindMinyan";
import { CreateMinyan } from "./pages/CreateMinyan";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/find" element={<FindMinyan />} />
      <Route path="/create" element={<CreateMinyan />} />
    </Routes>
  );
}
