import { seedAdminIfNeeded } from "../src/lib/seed";

seedAdminIfNeeded()
  .then((result) => {
    console.log(
      result.created
        ? "Seed completed. Admin: admin / admin123"
        : "Admin already exists."
    );
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
