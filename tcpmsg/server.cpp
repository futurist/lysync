// Copyright (c) 2015 Cesanta Software Limited
// All rights reserved

#include "mongoose.h"
#include "helper.c"


#define ACTION_DEFAULT 0
#define ACTION_CMD 100
#define ACTION_UPDATE 101

static const char *s_http_port = "8000";

static void handle_request(struct mg_connection *nc, int ev, void *ev_data, int action) {
	struct http_message *hm = (struct http_message *) ev_data;

	switch (ev) {
	case MG_EV_HTTP_REQUEST:

		char buf[2550];
		char uri[255];
		int count;

		switch (action)
		{
		case ACTION_CMD:

			sprintf(uri, "%.*s", hm->uri.len, hm->uri.p);

			str_array uri_part = str_split(uri, "/");

			mg_printf(nc, "HTTP/1.0 200 OK\r\n\r\n[cmd]%.*s<br>%.*s<br>%d-%s",
				hm->query_string.len, hm->query_string.p,
				hm->uri.len, hm->uri.p,
				uri_part.len, uri_part.p[0]
			);

			count = mg_url_decode(hm->query_string.p, hm->query_string.len, buf, 255, true);

			if(count>0) ShellExecuteA(NULL, "Open", "nircmd.exe", buf, NULL, SW_SHOWNORMAL);

			break;

		case ACTION_UPDATE:
			// do upgrade

			mg_printf(nc, "HTTP/1.1 204 OK");

			break;

		default:

			sprintf(buf, "<h1>%s</h1>%.*s<br>%.*s", "hi there", hm->uri.len, hm->uri.p, hm->query_string.len, hm->query_string.p);

			mg_send_head(nc, 200, strlen(buf), "Content-Type: text/html; charset=UTF-8\r\nX-AAA: asdf");

			//mg_printf(c, "%s\r\n\r\n", "HTTP/1.1 200 OK\r\nContent-Type:text/html; charset=UTF-8\r\nConnection: close");

			mg_printf(nc, "%s", buf);

			break;
		}

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
	for (;;) {
		mg_mgr_poll(&mgr, 1000);
	}
	mg_mgr_free(&mgr);

	return EXIT_SUCCESS;
}


