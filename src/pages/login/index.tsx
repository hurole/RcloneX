import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import appLogo from "@/assets/appIcon.png";
import { useRequest } from "alova/client";
import { connect } from "@/services";
import { toast, Toaster } from "sonner";
import { useNavigate } from "react-router";

export default function Login() {
  const [remote, setRemote] = useState("");
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");

  const navigate = useNavigate();

  const { send } = useRequest(connect, {
    immediate: false,
  });

  const onSubmit = async () => {
    await send(remote, user, pass);
    toast.success("连接成功");
    navigate("/");
  };

  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-muted p-6 md:p-10">
      <div className="w-full max-w-sm md:max-w-3xl">
        <div className="flex flex-col gap-6">
          <Card className="overflow-hidden py-0">
            <CardContent className="grid p-0 md:grid-cols-2">
              <div className="hidden bg-muted md:flex justify-center items-center">
                <img
                  src={appLogo}
                  alt="Image"
                  className="inset-0 h-1/2 w-auto dark:brightness-[0.2] dark:grayscale"
                />
              </div>
              <div className="p-6 md:p-10">
                <div className="flex flex-col gap-6">
                  <div className="flex flex-col items-center text-center">
                    <h1 className="text-2xl font-bold">Welcome To RcloneX</h1>
                    <p className="text-balance text-muted-foreground">
                      Login to your Rclone remote control
                    </p>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="remote">Remote</Label>
                    <Input
                      id="remote"
                      type="text"
                      placeholder="http://localhost:5572"
                      required
                      value={remote}
                      onChange={(e) => setRemote(e.target.value)}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="user">User</Label>
                    <Input
                      id="user"
                      type="user"
                      placeholder="rc-user"
                      required
                      value={user}
                      onChange={(e) => setUser(e.target.value)}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      value={pass}
                      placeholder="rc-pass"
                      required
                      onChange={(e) => setPass(e.target.value)}
                    />
                  </div>
                  <Button className="w-full" onClick={onSubmit}>
                    Connect
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        <Toaster position="top-center" richColors />
      </div>
    </div>
  );
}
