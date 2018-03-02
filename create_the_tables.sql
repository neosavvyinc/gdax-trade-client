--
-- PostgreSQL database dump
--

-- Dumped from database version 10.2
-- Dumped by pg_dump version 10.2

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SET check_function_bodies = false;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: plpgsql; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS plpgsql WITH SCHEMA pg_catalog;


--
-- Name: EXTENSION plpgsql; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION plpgsql IS 'PL/pgSQL procedural language';


--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


SET search_path = public, pg_catalog;

SET default_tablespace = '';

SET default_with_oids = false;

--
-- Name: portfolio_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE portfolio_history (
    id uuid DEFAULT uuid_generate_v4() NOT NULL,
    dollar_value double precision NOT NULL,
    btc_value double precision NOT NULL,
    eth_value double precision NOT NULL,
    ltc_value double precision NOT NULL,
    bch_value double precision NOT NULL,
    "timestamp" timestamp with time zone NOT NULL,
    total_value double precision NOT NULL
);


--
-- Name: price_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE price_history (
    id uuid DEFAULT uuid_generate_v4() NOT NULL,
    product_id character(7) NOT NULL,
    price double precision NOT NULL,
    open_24h double precision NOT NULL,
    volume_24h double precision NOT NULL,
    low_24h double precision NOT NULL,
    high_24h double precision NOT NULL,
    volume_30d double precision NOT NULL,
    best_bid double precision NOT NULL,
    best_ask double precision NOT NULL,
    "time" timestamp with time zone NOT NULL
);


CREATE TABLE hourly_candles (
    id uuid DEFAULT uuid_generate_v4() NOT NULL,
    product_id character(7) NOT NULL,
    open_price double precision NOT NULL,
	close_price double precision NOT NULL,
    volume double precision NOT NULL,
    low double precision NOT NULL,
    high double precision NOT NULL,
    "time" timestamp with time zone NOT NULL
);

--
-- Name: portfolio_history portfolio_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY portfolio_history
    ADD CONSTRAINT portfolio_history_pkey PRIMARY KEY (id);


--
-- Name: price_history price_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY price_history
    ADD CONSTRAINT price_history_pkey PRIMARY KEY (id);


--
-- PostgreSQL database dump complete
--

