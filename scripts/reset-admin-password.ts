
import "dotenv/config";
import bcrypt from "bcryptjs";
import { prisma } from "../src/lib/prisma";

async function main() {
  const email = "admin@fixhub.com";
  const password = process.env.RESET_ADMIN_PASSWORD;

  if (!password || password.length < 12 || password.length > 72) {
    throw new Error(
      "Set RESET_ADMIN_PASSWORD to a password of 12–72 characters."
    );
  }

  const admin = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, role: true },
  });

  if (!admin) {
    throw new Error(`Account not found: ${email}`);
  }

  if (admin.role !== "admin") {
    throw new Error("The target account is not an admin.");
  }

  const hash = await bcrypt.hash(password, 12);

  await prisma.user.update({
    where: { id: admin.id },
    data: {
      password: hash,
      failedAttempts: 0,
      lockedUntil: null,
    },
  });

  console.log(`Password reset successfully for ${admin.email}.`);
  console.log("The account lockout has been cleared.");
}

main()
  .catch((error) => {
    console.error("Password reset failed:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
