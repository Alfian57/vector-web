export const farmer = {
  id: "vektor-demo-farmer",
  email: "petani@gmail.com",
  name: "Petani Demo",
  phoneNumber: "+62895363116378",
  role: "farmer",
};
export const officer = {
  id: "vektor-demo-officer",
  email: "petugas@gmail.com",
  name: "Petugas Demo",
  phoneNumber: "+62895363116379",
  role: "officer",
};
export const administrator = {
  id: "vektor-demo-admin",
  email: "admin@gmail.com",
  name: "Admin VEKTOR",
  phoneNumber: "+62895363116380",
  role: "admin",
};
export const demoPassword = "password";
const now = Date.now();
export const ago = (hours: number) => new Date(now - hours * 3_600_000);
export const demoId = (key: number) => `f2dd2def-2336-4c5c-ae1e-${key.toString(16).padStart(12, "0")}`;
