import { Link } from "react-router-dom";

const Footer = () => (
  <footer className="border-t border-border/50 py-12 mt-16">
    <div className="container mx-auto px-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        <div>
          <h3 className="text-lg font-bold text-gradient mb-4">Kivu Cinema</h3>
          <p className="text-sm text-muted-foreground">
            Kivu Cinema. Premium video streaming and watch anywhere, anytime.
          </p>
        </div>
        <div>
          <h4 className="font-semibold mb-3 text-sm">Support</h4>
          <ul className="flex flex-col gap-2 text-sm text-muted-foreground list-disc pl-5">
            <li>
              Email:{" "}
              <a href="mailto:shyakabruce0@gmail.com" className="hover:text-foreground transition-colors">
                shyakabruce0@gmail.com
              </a>
            </li>
            <li>
              Phone:{" "}
              <a href="tel:+250793919556" className="hover:text-foreground transition-colors">
                +250 793 919 556
              </a>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border/50 pt-6 text-center text-xs text-muted-foreground space-y-1">
        <p>© {new Date().getFullYear()} Kivu Cinema. All rights reserved.</p>
        <p>Developed by <a href="https://www.instagram.com/1chanel___/" target="_blank" rel="noopener noreferrer" className="text-foreground font-medium hover:text-primary transition-colors">Chanel</a></p>
      </div>
    </div>
  </footer>
);

export default Footer;
