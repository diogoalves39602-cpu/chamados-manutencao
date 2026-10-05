import { exigirAdmin } from "@/lib/auth/sessao";
import { AbasAdmin } from "./abas-admin";

export default async function LayoutAdmin({ children }: LayoutProps<"/admin">) {
  await exigirAdmin();
  return (
    <div className="flex flex-col gap-6">
      <AbasAdmin />
      {children}
    </div>
  );
}
