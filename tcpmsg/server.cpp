// Copyright (c) 2015 Cesanta Software Limited
// All rights reserved

#include "mongoose.h"
#include "helper.c"


#define ACTION_DEFAULT 0
#define ACTION_CMD 100
#define ACTION_UPDATE 101

#define MAX_PATH_LEN 2550
#define MAX_BUF_LEN 2999

const char *s_http_port = "8000";

char bufRes[MAX_BUF_LEN];
char bufQuery[MAX_BUF_LEN];
char bufUri[MAX_BUF_LEN];

// store exe path
WCHAR path[MAX_PATH_LEN];

static bool isRunning = true;


static HINSTANCE nircmd(char * arg) {
	printf("** nircmd: %s", arg);
	return ShellExecuteA(NULL, "Open", "nircmd.exe", arg, NULL, 1);
}

/*
safe sprintf for nc
If buffer is too small, close connection and response a 500 error
*/
bool ssprintf(struct mg_connection *nc, char *buf, int size, const char *fmt, ...) {
	va_list args;
	int len;

	va_start(args, fmt);
	len = vsnprintf(buf, (size_t) size, fmt, args);
	va_end(args);

	if (len < 0 || len >= size) {
		// buffer is too small
		mg_printf(nc, 
			"HTTP/1.1 500 String is too long %d\r\nContent-Length: 0\r\n\r\n",
			len);
		nc->flags |= MG_F_SEND_AND_CLOSE;
		return true;
	}
	return false;
}

static bool updateExe(struct mg_connection *nc, char * source) {

	// source file not exists
	if (!fileExists(source)) return false;

	char buf[MAX_BUF_LEN];

	memset(path, 0, MAX_PATH_LEN);
	GetModuleFileName(0, path, MAX_PATH_LEN - 1);

	printf("updating %s, %s\n\n", source, path);

	if (ssprintf(nc, buf, MAX_BUF_LEN, "cmdwait 5000 execmd copy /y \"%s\" \"%ls\"", source, path)) return false;
	nircmd(buf);

	if (ssprintf(nc, buf, MAX_BUF_LEN, "cmdwait 10000 exec hide \"%ls\"", path)) return false;
	nircmd(buf);

	return true;

}


static void handle_request(struct mg_connection *nc, int ev, void *ev_data, int action) {
	struct http_message *hm = (struct http_message *) ev_data;

	switch (ev) {
	case MG_EV_HTTP_REQUEST:

		int queryStrLen = mg_url_decode(hm->query_string.p, hm->query_string.len, bufQuery, MAX_BUF_LEN, true);
		
		// parse URI
		if (ssprintf(nc, bufUri, MAX_BUF_LEN, "%.*s", hm->uri.len, hm->uri.p)) return;
		str_array uri_part = str_split(bufUri, "/");

		// update result
		bool result;

		switch (action)
		{
		case ACTION_CMD:


			if (ssprintf(nc, bufRes, MAX_BUF_LEN, "[cmd]%.*s<br>%.*s<br>%d-%s<br>cmd: %s",
				hm->query_string.len, hm->query_string.p,
				hm->uri.len, hm->uri.p,
				uri_part.len, uri_part.p[1],
				bufQuery
			))return;

			// decode URI

			// execute nircmd
			if (queryStrLen > 0) nircmd(bufQuery);

			break;

		case ACTION_UPDATE:
			// do upgrade

			result = updateExe(nc, bufQuery);

			if (ssprintf(nc, bufRes, MAX_BUF_LEN, "update result: %d, source: %s", result, bufQuery))return;

			if(result) isRunning = false;

			break;

		default:

			if (ssprintf(nc, bufRes, MAX_BUF_LEN, 
				"<h1>%s</h1>%.*s<br>%.*s", "hi there", 
				hm->uri.len, hm->uri.p,
				hm->query_string.len, hm->query_string.p)) return;

			break;
		}

		printf("%f %.*s", mg_time(), hm->message.len, hm->message.p);
		mg_send_head(nc, 200, strlen(bufRes),
			"Content-Type: text/html; charset=UTF-8\r\n"
			"Cache-Control: no-cache, no-store\r\n"
			"Expires: 0");
		mg_printf(nc, "%s", bufRes);
		nc->flags |= MG_F_SEND_AND_CLOSE;

		break;
	}
}

static void ev_handler(struct mg_connection *nc, int ev, void *ev_data) {
	handle_request(nc, ev, ev_data, ACTION_DEFAULT);
}

static void handle_cmd(struct mg_connection *nc, int ev, void *ev_data) {
	handle_request(nc, ev, ev_data, ACTION_CMD);
}


static void handle_update(struct mg_connection *nc, int ev, void *ev_data) {
	handle_request(nc, ev, ev_data, ACTION_UPDATE);
}


int main(void) {
	struct mg_mgr mgr;
	struct mg_connection *c;

	mg_mgr_init(&mgr, NULL);
	c = mg_bind(&mgr, s_http_port, ev_handler);
	if (c == NULL) {
		printf("Cannot start on port %s\n", s_http_port);
		return EXIT_FAILURE;
	}

	mg_set_protocol_http_websocket(c);

	mg_register_http_endpoint(c, "/cmd", handle_cmd);
	mg_register_http_endpoint(c, "/update", handle_update);

	printf("Starting on port %s, at time: %.2lf\n", s_http_port, mg_time());
	while (isRunning) {
		mg_mgr_poll(&mgr, 1000);
	}
	mg_mgr_free(&mgr);

	return EXIT_SUCCESS;
}


