CREATE TABLE public.users
(
    id bigserial NOT NULL,
    username character varying NOT NULL,
    passwrod character varying NOT NULL,
    updated_at timestamp without time zone,
    PRIMARY KEY (id)
);