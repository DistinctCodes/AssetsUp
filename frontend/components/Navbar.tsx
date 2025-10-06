import { Building2 } from 'lucide-react';

const Navbar = () => {
  return (
    <nav className="w-full px-6 py-4 flex items-center justify-between bg-transparent">
      <div className="flex items-center space-x-2">
        <Building2 className="text-primary" />
        <span className="text-lg font-bold text-white">Our Project</span>
      </div>
    </nav>
  );
};

export default Navbar;
