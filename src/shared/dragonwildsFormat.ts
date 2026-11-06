const UTC_SUFFIX = "UTC";

const ISO_DATE_LENGTH = 10;

const ISO_TIME_START = 11;

const ISO_TIME_END = 16;

export const formatUtc = (at: number) => {
	const iso = new Date(at).toISOString();

	return `${iso.slice(0, ISO_DATE_LENGTH)} ${iso.slice(ISO_TIME_START, ISO_TIME_END)} ${UTC_SUFFIX}`;
};
