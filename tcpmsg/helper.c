#include <stddef.h>
#include <stdio.h>
#include <string.h>

// define array of strings
struct str_array
{
	char ** p;  // array pointer
	size_t len; // array length
};

struct str_array str_split(char *a_str, const char *a_delim);



/*
split string from delim
return array pointer & array lenth
*/
struct str_array str_split(char *a_str, const char *a_delim) {

	char *array[10];
	struct str_array ret = { array, 0 };
	int i = 0;

	array[i] = strtok(a_str, a_delim);

	while (i<10 && array[i] != NULL)
	{
		array[++i] = strtok(NULL, a_delim);
	}
	
	ret.len = i;

	return ret;
}

/*
Check if file exists
*/
int fileExists(const char *filename)
{
	FILE *fp = fopen(filename, "r");
	if (fp != NULL) fclose(fp);
	return (fp != NULL);
}
