
-- Allow public update on ban_reports
DROP POLICY IF EXISTS "Service role can update ban reports" ON ban_reports;
DROP POLICY IF EXISTS "Allow public update on ban_reports" ON ban_reports;
CREATE POLICY "Allow public update on ban_reports" ON ban_reports FOR UPDATE USING (true) WITH CHECK (true);

-- Allow public delete on ban_reports
DROP POLICY IF EXISTS "Allow public delete on ban_reports" ON ban_reports;
CREATE POLICY "Allow public delete on ban_reports" ON ban_reports FOR DELETE USING (true);

-- Allow public update on salary_requests
DROP POLICY IF EXISTS "Allow public update on salary_requests" ON salary_requests;
CREATE POLICY "Allow public update on salary_requests" ON salary_requests FOR UPDATE USING (true) WITH CHECK (true);

-- Allow public update on vip_requests
DROP POLICY IF EXISTS "Allow public update on vip_requests" ON vip_requests;
CREATE POLICY "Allow public update on vip_requests" ON vip_requests FOR UPDATE USING (true) WITH CHECK (true);

-- Allow public update on support_tickets (already exists but ensure)
DROP POLICY IF EXISTS "Anyone can update tickets" ON support_tickets;
DROP POLICY IF EXISTS "Allow public update on support_tickets" ON support_tickets;
CREATE POLICY "Allow public update on support_tickets" ON support_tickets FOR UPDATE USING (true) WITH CHECK (true);

-- Allow public update on admin_host_requests (already exists but ensure)
DROP POLICY IF EXISTS "Anyone can update admin_host_requests" ON admin_host_requests;
DROP POLICY IF EXISTS "Allow public update on admin_host_requests" ON admin_host_requests;
CREATE POLICY "Allow public update on admin_host_requests" ON admin_host_requests FOR UPDATE USING (true) WITH CHECK (true);
