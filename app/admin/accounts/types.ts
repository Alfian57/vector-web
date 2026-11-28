export type UserRow = {
  id: string;
  name: string;
  email: string;
  phoneNumber: string | null;
  role: string;
  banned: boolean;
  banReason: string | null;
  createdAt: string;
};
