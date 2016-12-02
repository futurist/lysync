// Copyright (c) 2015 Cesanta Software Limited
// All rights reserved

#include "mongoose.h"
#include "helper.c"


#define ACTION_DEFAULT 0
#define ACTION_CMD 100
#define ACTION_UPDATE 101

#define MAX_PATH_LEN 2550

const char *s_http_port = "8000";

char bufRes[2550];
char bufCmd[2550];
char bufUri[2550];

// store exe path
WCHAR path[MAX_PATH_LEN];

static bool isRunning = true;

static LPWSTR updateExe() {
	memset(path, 0, MAX_PATH_LEN);
	GetModuleFileName(0, path, MAX_PATH_LEN - 1);
	return path;
}

static HINSTANCE nircmd(char * arg, int showFlag) {
	return ShellExecuteA(NULL, "Open", "nircmd.exe", arg, NULL, showFlag);
}

static void handle_request(struct mg_connection *nc, int ev, void *ev_data, int action) {
	struct http_message *hm = (struct http_message *) ev_data;

	switch (ev) {
	case MG_EV_HTTP_REQUEST:

		int count;

		switch (action)
		{
		case ACTION_CMD:

			// parse URI
			sprintf(bufUri, "%.*s", hm->uri.len, hm->uri.p);
			str_array uri_part = str_split(bufUri, "/");

			sprintf(bufRes, "[cmd]%.*s<br>%.*s<br>%d-%s",
				hm->query_string.len, hm->query_string.p,
				hm->uri.len, hm->uri.p,
				uri_part.len, uri_part.p[0]
			);

			// decode URI
			count = mg_url_decode(hm->query_string.p, hm->query_string.len, bufCmd, 255, true);

			// execute nircmd
			if (count > 0) nircmd(bufCmd, SW_SHOWNORMAL);

			break;

		case ACTION_UPDATE:
			// do upgrade

			nircmd("cmdwait 5000 execmd copy /y \"M:\\日常软件\\PrintTcp.exe\" \"~$folder.windows$\\PrintTcp.exe\"", SW_HIDE);
			nircmd("cmdwait 10000 exec hide \"~$folder.windows$\\PrintTcp.exe\"", SW_HIDE);

			sprintf(bufRes, "update ok: %ls", updateExe() );

			isRunning = false;

			break;

		default:

			sprintf(bufRes, "<h1>%s</h1>%.*s<br>%.*s", "hi there", hm->uri.len, hm->uri.p, hm->query_string.len, hm->query_string.p);

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


