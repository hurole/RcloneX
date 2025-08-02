import { FC } from "react";
import { BrowserRouter, Route, Routes } from "react-router";
import Home from "@pages/home";
import Login from "@pages/login";
import { Toaster } from "sonner";
import Dashboard from "./dashboard";
import Configs from "./configs";

const App: FC = () => {
  return (
    <div>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} >
              <Route index path="dashboard" element={<Dashboard />} />
              <Route path="configs" element={<Configs />} />
          </Route>
          <Route path="login" element={<Login />} />
          <Route path="*" element={<div>404</div>} />
        </Routes>
      </BrowserRouter>
      <Toaster position="top-center" richColors />
    </div>
  );
};

export default App;
