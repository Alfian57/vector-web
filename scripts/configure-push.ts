import { chmod, readFile, writeFile } from "node:fs/promises";
import { generateVAPIDKeys } from "web-push";

const [filename = ".env.local", contact = "mailto:vektor@example.test"] = process.argv.slice(2);
if (!/^mailto:[^\s@]+@[^\s@]+$/.test(contact)) throw new Error("Gunakan alamat kontak dalam format mailto:nama@domain.");

let contents = await readFile(filename, "utf8");

function variableLine(name: string) {
  return new RegExp(`^${name}=(.*)$`, "m");
}

function readVariable(name: string) {
  return contents.match(variableLine(name))?.[1].trim().replace(/^(["'])(.*)\1$/, "$2");
}

function writeVariable(name: string, value: string) {
  const pattern = variableLine(name);
  contents = pattern.test(contents)
    ? contents.replace(pattern, () => `${name}=${value}`)
    : `${contents.trimEnd()}\n${name}=${value}\n`;
}

const publicKey = readVariable("VAPID_PUBLIC_KEY");
const privateKey = readVariable("VAPID_PRIVATE_KEY");
if (Boolean(publicKey) !== Boolean(privateKey)) throw new Error("Lengkapi pasangan kunci VAPID yang sudah ada di file env.");
const subject = readVariable("VAPID_SUBJECT");
if (publicKey && subject) {
  console.log(`Web Push sudah dikonfigurasi di ${filename}.`);
} else {
  if (!publicKey) {
    const keys = generateVAPIDKeys();
    writeVariable("VAPID_PUBLIC_KEY", keys.publicKey);
    writeVariable("VAPID_PRIVATE_KEY", keys.privateKey);
  }
  if (!subject) writeVariable("VAPID_SUBJECT", contact);
  await chmod(filename, 0o600);
  await writeFile(filename, contents);
  console.log(`Konfigurasi Web Push tersimpan di ${filename}. Mulai ulang aplikasi dan worker.`);
}
