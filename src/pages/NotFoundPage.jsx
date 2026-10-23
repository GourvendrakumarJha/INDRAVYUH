import { Compass } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Brand } from '../components/Brand';

export default function NotFoundPage() {
  return <div className="not-found"><Brand /><div><Compass size={48} /><span className="eyebrow">404 · ROUTE NOT FOUND</span><h1>This path is outside the coordination map.</h1><p>Return to the public homepage or choose an authorised portal.</p><Link to="/" className="btn btn-primary">Public homepage</Link><Link to="/access" className="btn btn-outline">Portal access</Link></div></div>;
}
