export function parseUrl(urlLike: string | null) {
	if (urlLike) {
		try {
			try {
				// Try to construct URL directly first
				return new URL(urlLike);
			} catch {
				// If that fails, try adding https:// and construct again
				return new URL(`https://${urlLike}`);
			}
		} catch (error) {
			return null;
		}
	} else {
		return null;
	}
}
