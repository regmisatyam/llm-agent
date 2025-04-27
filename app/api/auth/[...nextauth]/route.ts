import NextAuth from "next-auth";
import { authOptions } from "./auth";

console.log("NextAuth route handler initialized");

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST }; 