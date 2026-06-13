import { auth } from "@/auth";
import { notFound } from "next/navigation";
import TestClient from "./TestClient";

export default async function TestPage() {
  const session = await auth();

  if (!session || !session.user || !session.user.email) {
    notFound();
  }

  const allowedEmails = ["fajarwg@gmail.com", "fajarwahyugumelar@gmail.com"];
  const userEmail = session.user.email.toLowerCase();

  if (!allowedEmails.includes(userEmail)) {
    notFound();
  }

  return <TestClient />;
}
