import React from 'react';
import { seoConfig } from '@/constants/seoConfig';
import ContactPageClient from './ContactPageClient';

export const metadata = seoConfig.contact;

export default function ContactPage() {
	return <ContactPageClient />;
}
