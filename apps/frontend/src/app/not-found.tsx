import { Metadata } from 'next';
import NotFoundClient from './NotFoundClient';

export const metadata: Metadata = {
  title: 'Page Not Found - Henzo',
  description: 'The page you are looking for could not be found.',
};

export default function NotFound() {
  return <NotFoundClient />;
}
