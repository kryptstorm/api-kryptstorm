export default class XError extends Error {
	constructor(message, httpCode = 500, errors = {}) {
		super(message);
		this.message$ = message;
		this.httpCode$ = httpCode;
		this.errors$ = errors;
		this.data$ = {};
	}
}