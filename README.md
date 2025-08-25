
# CoinSR - A Full-Stack Trading Application

This is a Next.js application built in Firebase Studio, leveraging Supabase for a robust backend, real-time data, and authentication.

## Core Technologies

-   **Framework**: Next.js (with App Router)
-   **Backend & DB**: Supabase (PostgreSQL, Auth, Realtime, Storage)
-   **Styling**: Tailwind CSS & ShadCN UI
-   **AI Integration**: Google AI & Genkit

## Production Architecture Overview

The application is architected with a clear separation between a lightweight frontend and a powerful, logic-driven backend, ensuring scalability, data consistency, and security.

### 1. Data Flow & Backend Logic

All critical business logic is handled by the Supabase backend, primarily through PostgreSQL functions and triggers.

-   **Authentication**: Managed entirely by **Supabase Auth**. When a new user signs up, a trigger automatically creates a corresponding profile in our public `profiles` table.

-   **Market Data Pipeline**:
    1.  **External API Polling**: A backend cron job (e.g., Supabase Edge Function scheduled with `pg_cron`) periodically fetches real-time market data from external APIs like Tatum and Yahoo Finance.
    2.  **Staging & Intervention**: The raw data is first processed by a backend function. This function checks for any active **market intervention rules** defined by admins in the `system_settings` table. If a rule is active for a specific trading pair, the real-world data is overridden by the admin-defined simulation logic (e.g., force price up/down within a range).
    3.  **Data Persistence**: The final, processed data (either real or simulated) is saved to the `market_summary_data` and `market_kline_data` tables.

-   **Automated Trade Settlement**:
    *   A database function `settle_due_records()` runs automatically every minute via `pg_cron`.
    *   It queries for all "active" contract trades and investments whose `settlement_time` has passed.
    *   Within a secure database transaction, it calculates profit/loss, updates the order's status to "settled", and transfers the principal and profit back to the user's balance in the `balances` table.

-   **Automated Commission Distribution**:
    *   A database trigger is attached to the `trades` table.
    *   Whenever a new trade is successfully inserted, a function `distribute_trade_commissions()` is automatically executed.
    *   This function recursively finds the trader's three levels of inviters, calculates the appropriate commission for each level, and directly updates their USDT balance in the `balances` table.

### 2. Frontend Responsibilities

The Next.js frontend is primarily a **reactive presentation layer**.

-   **Data Consumption**: Instead of making direct API calls for business data, components use `Context` providers that subscribe to **Supabase Realtime channels**.
-   **Real-time Updates**: When data changes in the backend (e.g., a new price point arrives, a trade is settled, a balance is updated), Supabase pushes the change through the real-time connection, and the React components automatically re-render with the new data.
-   **User Input**: The frontend is responsible for securely capturing user input (e.g., placing a trade, updating profile) and sending it to the backend via Supabase's client library. It does not contain any complex business logic.

### 3. Advantages of this Architecture

*   **Lightweight Client**: The user's browser is freed from heavy computations like market simulation or commission calculations, leading to a faster, smoother user experience.
*   **Data Consistency & Atomicity**: All users see the exact same market data. Critical financial calculations (settlements, commissions) are performed in atomic database transactions, preventing partial updates and ensuring financial integrity.
*   **Security & Reliability**: Core business logic is protected within the backend, inaccessible from the client-side. Automated, server-side cron jobs ensure that processes like trade settlement occur reliably, regardless of whether the user is online.
*   **Scalability**: The backend-centric logic is far more scalable than a client-side approach, capable of handling a growing number of users and transactions efficiently.

## Supabase Setup Guide

To run and develop this project locally, a Supabase project is required.

1.  **Create a Supabase Project**: Go to [supabase.com](https://supabase.com) and create a new project.

2.  **Get API Credentials**: In your Supabase project dashboard, navigate to **Project Settings** > **API**. You will find your **Project URL** and your **anon (public) key**.

3.  **Set Environment Variables**: Create a `.env` file in the root of this project and add your credentials:
    ```
    NEXT_PUBLIC_SUPABASE_URL=YOUR_PROJECT_URL
    NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_ANON_KEY
    ```

4.  **Run SQL Script**: Go to the **SQL Editor** in your Supabase dashboard, paste the entire content of the `supabase.sql` file from this project's root directory, and click **"Run"**. This will create all the necessary tables, functions, triggers, and security policies.

5.  **Enable pg_cron (for automated settlement)**:
    *   In your Supabase dashboard, go to **Database** -> **Extensions**.
    *   Find `pg_cron` in the list and enable it. The `supabase.sql` script already contains the job scheduling command.
