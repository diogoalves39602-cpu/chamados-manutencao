import { exigirAdmin } from "@/lib/auth/sessao";

export default async function LayoutAdmin({ children }: LayoutProps<"/admin">) {
  await exigirAdmin();
  return children;
}
