import Link from "next/link";

export default function Footer() {
  return (
    <footer className="w-full py-6 mt-12 bg-black/40 text-center text-sm text-white/60">
      <div className="flex justify-center gap-6 mb-4">
        <Link href="#" className="hover:text-white transition-colors">Termos de Uso</Link>
        <Link href="#" className="hover:text-white transition-colors">Privacidade</Link>
        <Link href="#" className="hover:text-white transition-colors">Contato</Link>
      </div>
      <p>&copy; {new Date().getFullYear()} Bora Stop. Todos os direitos reservados.</p>
    </footer>
  );
}
