import { Link } from "react-router-dom";

const Footer = () => (
  <footer className="border-t border-border/50 py-12 mt-16">
    <div className="container mx-auto px-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        <div>
          <h3 className="text-lg font-bold text-gradient mb-4">Kivu Cinema</h3>
          <p className="text-sm text-muted-foreground">
           Kivu Cinema is a digital movie distribution platform founded by young filmmaker Shyaka Bruce, 
            created to support solo and emerging filmmakers across Rwanda and Africa. The platform gives independent 
            creators a professional space to publish, showcase, and grow their films while 
            connecting local stories with wider audiences.
          </p>
        </div>
        <div>
          <h4 className="font-semibold mb-3 text-sm">Support</h4>
          <a
            href="tel:+250793919556"
            className="inline-flex items-center justify-center gap-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors px-4 py-2 text-sm font-medium"
          >
            Call +250 793 919 556
          </a>
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
