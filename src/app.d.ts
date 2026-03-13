// src/app.d.ts
import type { User, Session } from 'better-auth/minimal';

declare global {
	namespace App {
		interface Locals {
			user?: User & { role: string };
			session?: Session;
			requestId?: string;
		}

		interface Error {
			message: string;
			code?: string;
		}

		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
