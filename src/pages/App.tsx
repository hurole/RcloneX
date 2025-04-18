import { FC } from "react";
import { BrowserRouter, Route, Routes } from "react-router";
import Home from "@pages/home";
import Login from "@pages/login";
import { Toaster } from "sonner";

const App: FC = () => {
  return (
    <div>
      <BrowserRouter>
        <Routes>
          <Route index element={<Home />} />
          <Route path="login" element={<Login />} />
          <Route path="*" element={<div>404</div>} />
        </Routes>
      </BrowserRouter>
      <Toaster position="top-center" richColors />
    </div>
  );
};

export default App;
