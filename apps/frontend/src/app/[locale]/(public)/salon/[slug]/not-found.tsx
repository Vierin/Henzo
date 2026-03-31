import { Metadata } from 'next';
import NotFoundClient from './NotFoundClient';

export const metadata: Metadata = {
	title: 'Salon Not Found',
	description: 'The requested salon could not be found.',
};

export default function NotFound() {
	return <NotFoundClient />;
}
