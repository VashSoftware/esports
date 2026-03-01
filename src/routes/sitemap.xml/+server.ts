import type { RequestHandler } from './$types';

const ORIGIN = 'https://esports.vash.software';

const pages = [
	{ url: '/', priority: '1.0', changefreq: 'daily' },
	{ url: '/matches', priority: '0.8', changefreq: 'hourly' },
	{ url: '/mappools', priority: '0.7', changefreq: 'daily' },
	{ url: '/leaderboard', priority: '0.7', changefreq: 'daily' },
	{ url: '/terms', priority: '0.3', changefreq: 'monthly' },
	{ url: '/privacy', priority: '0.3', changefreq: 'monthly' }
];

export const GET: RequestHandler = () => {
	const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages
	.map(
		(p) => `  <url>
    <loc>${ORIGIN}${p.url}</loc>
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority}</priority>
  </url>`
	)
	.join('\n')}
</urlset>`;

	return new Response(xml, {
		headers: {
			'Content-Type': 'application/xml',
			'Cache-Control': 'max-age=3600'
		}
	});
};
