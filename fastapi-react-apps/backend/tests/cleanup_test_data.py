#!/usr/bin/env python3
"""Script to cleanup test data and verify."""
import httpx
import sys
import os

BASE_URL = "http://localhost:8888"
TEST_APP = "e2e-test-app"
TEST_NS = "e2e-test-ns"
TEST_ENV = "dev"

# Use a user with platform_admin permissions for cleanup
# This should match a user configured with platform_admin role
CLEANUP_USER = os.getenv("CLEANUP_USER", "usr_platform_admin")

def main():
    print("Starting cleanup...", flush=True)

    headers = {"x-user": CLEANUP_USER}

    with httpx.Client(base_url=BASE_URL, timeout=30.0, headers=headers) as client:
        # Check if app exists
        r = client.get('/api/v1/apps', params={'env': TEST_ENV})
        if r.status_code == 200:
            apps = r.json()
            if TEST_APP in apps:
                print(f"Found {TEST_APP}, deleting...", flush=True)

                # First try to delete namespace
                client.delete(
                    f'/api/v1/apps/{TEST_APP}/namespaces',
                    params={'env': TEST_ENV, 'namespaces': TEST_NS}
                )

                # Then delete the app
                dr = client.delete(f'/api/v1/apps/{TEST_APP}', params={'env': TEST_ENV})
                print(f"Delete response: {dr.status_code}", flush=True)

                # Verify deletion
                r2 = client.get('/api/v1/apps', params={'env': TEST_ENV})
                if r2.status_code == 200:
                    if TEST_APP in r2.json():
                        print(f"ERROR: {TEST_APP} still exists!", flush=True)
                        sys.exit(1)
                    else:
                        print(f"SUCCESS: {TEST_APP} deleted", flush=True)
            else:
                print(f"{TEST_APP} does not exist (already clean)", flush=True)
        else:
            print(f"Error getting apps: {r.status_code}", flush=True)

if __name__ == "__main__":
    main()
