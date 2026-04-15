/**
 * Bug Condition Exploration Test for Studio Redirect Issue
 *
 * **Validates: Requirements 2.1, 2.2, 2.3**
 *
 * Property 1: Bug Condition - Studio Return Redirects to Landing Page Instead of Role Dashboard
 *
 * CRITICAL: This test MUST FAIL on unfixed code - failure confirms the bug exists
 * DO NOT attempt to fix the test or the code when it fails
 *
 * This test encodes the expected behavior - it will validate the fix when it passes after implementation
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import * as fc from "fast-check";
import Studio from "./Studio";

// Mock dependencies
vi.mock("@/auth/AuthProvider", () => ({
  useAuth: vi.fn(),
}));

vi.mock("@tanstack/react-query", () => ({
  useMutation: vi.fn(() => ({
    mutate: vi.fn(),
    isPending: false,
  })),
  useQuery: vi.fn(() => ({
    data: null,
    isLoading: false,
  })),
}));

vi.mock("@/components/ui/use-toast", () => ({
  useToast: vi.fn(() => ({
    toast: vi.fn(),
  })),
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: vi.fn(),
  };
});

import { useAuth } from "@/auth/AuthProvider";
import { useNavigate } from "react-router-dom";

describe("Bug Condition 1: Studio Return Redirects to Role-Specific Dashboard", () => {
  let mockNavigate: ReturnType<typeof vi.fn>;
  let mockUseAuth: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockNavigate = vi.fn();
    mockUseAuth = vi.fn();

    (useNavigate as any).mockReturnValue(mockNavigate);
    (useAuth as any).mockImplementation(mockUseAuth);
  });

  /**
   * Test Case 1: Brand User Studio Return
   *
   * EXPECTED BEHAVIOR: Brand users clicking "Back to likelee.ai" should be redirected to "/BrandDashboard"
   * CURRENT BEHAVIOR (BUG): Redirects to "/" instead
   *
   * When this test FAILS, it confirms the bug exists
   */
  it('should redirect authenticated brand users to /BrandDashboard when clicking "Back to likelee.ai"', () => {
    // Arrange: Set up authenticated brand user
    mockUseAuth.mockReturnValue({
      initialized: true,
      authenticated: true,
      user: { id: "brand-user-1", email: "brand@example.com" },
      profile: {
        id: "brand-user-1",
        email: "brand@example.com",
        role: "brand",
        full_name: "Brand User",
      },
      supabase: {},
    });

    // Act: Render Studio component and click "Back to likelee.ai"
    render(
      <BrowserRouter>
        <Studio />
      </BrowserRouter>,
    );

    const backButton = screen.getAllByText("Back to likelee.ai")[0];
    fireEvent.click(backButton);

    // Assert: Should navigate to brand dashboard, not landing page
    expect(mockNavigate).toHaveBeenCalledWith("/BrandDashboard");
    expect(mockNavigate).not.toHaveBeenCalledWith("/");
  });

  /**
   * Test Case 2: Agency User Studio Return
   *
   * EXPECTED BEHAVIOR: Agency users clicking "Back to likelee.ai" should be redirected to "/AgencyDashboard"
   * CURRENT BEHAVIOR (BUG): Redirects to "/" instead
   *
   * When this test FAILS, it confirms the bug exists
   */
  it('should redirect authenticated agency users to /AgencyDashboard when clicking "Back to likelee.ai"', () => {
    // Arrange: Set up authenticated agency user
    mockUseAuth.mockReturnValue({
      initialized: true,
      authenticated: true,
      user: { id: "agency-user-1", email: "agency@example.com" },
      profile: {
        id: "agency-user-1",
        email: "agency@example.com",
        role: "agency",
        full_name: "Agency User",
      },
      supabase: {},
    });

    // Act: Render Studio component and click "Back to likelee.ai"
    render(
      <BrowserRouter>
        <Studio />
      </BrowserRouter>,
    );

    const backButton = screen.getAllByText("Back to likelee.ai")[0];
    fireEvent.click(backButton);

    // Assert: Should navigate to agency dashboard, not landing page
    expect(mockNavigate).toHaveBeenCalledWith("/AgencyDashboard");
    expect(mockNavigate).not.toHaveBeenCalledWith("/");
  });

  /**
   * Test Case 3: Creator User Studio Return
   *
   * EXPECTED BEHAVIOR: Creator users clicking "Back to likelee.ai" should be redirected to "/CreatorDashboard"
   * CURRENT BEHAVIOR (BUG): Redirects to "/" instead
   *
   * When this test FAILS, it confirms the bug exists
   */
  it('should redirect authenticated creator users to /CreatorDashboard when clicking "Back to likelee.ai"', () => {
    // Arrange: Set up authenticated creator user
    mockUseAuth.mockReturnValue({
      initialized: true,
      authenticated: true,
      user: { id: "creator-user-1", email: "creator@example.com" },
      profile: {
        id: "creator-user-1",
        email: "creator@example.com",
        role: "creator",
        full_name: "Creator User",
      },
      supabase: {},
    });

    // Act: Render Studio component and click "Back to likelee.ai"
    render(
      <BrowserRouter>
        <Studio />
      </BrowserRouter>,
    );

    const backButton = screen.getAllByText("Back to likelee.ai")[0];
    fireEvent.click(backButton);

    // Assert: Should navigate to creator dashboard, not landing page
    expect(mockNavigate).toHaveBeenCalledWith("/CreatorDashboard");
    expect(mockNavigate).not.toHaveBeenCalledWith("/");
  });

  /**
   * Property-Based Test: All Authenticated Users with Valid Roles
   *
   * This property-based test generates multiple test cases for authenticated users
   * with different roles to ensure the redirect logic works correctly for all cases.
   *
   * EXPECTED BEHAVIOR: Any authenticated user with a valid role should be redirected
   * to their role-specific dashboard, not the landing page.
   *
   * CURRENT BEHAVIOR (BUG): All users are redirected to "/" regardless of role
   */
  it("property: authenticated users with any valid role should redirect to their role-specific dashboard", () => {
    // Define the role-to-dashboard mapping (expected behavior)
    const roleToDashboard: Record<string, string> = {
      brand: "/BrandDashboard",
      agency: "/AgencyDashboard",
      creator: "/CreatorDashboard",
      talent: "/CreatorDashboard", // talent users also use creator dashboard
    };

    // Property-based test: Generate test cases for all valid roles
    fc.assert(
      fc.property(
        fc.constantFrom("brand", "agency", "creator", "talent"),
        fc.string({ minLength: 1, maxLength: 50 }),
        fc.emailAddress(),
        (role, fullName, email) => {
          // Arrange: Set up authenticated user with the generated role
          mockNavigate.mockClear();
          mockUseAuth.mockReturnValue({
            initialized: true,
            authenticated: true,
            user: { id: `user-${role}`, email },
            profile: {
              id: `user-${role}`,
              email,
              role,
              full_name: fullName,
            },
            supabase: {},
          });

          // Act: Render Studio component and click "Back to likelee.ai"
          const { unmount } = render(
            <BrowserRouter>
              <Studio />
            </BrowserRouter>,
          );

          const backButton = screen.getAllByText("Back to likelee.ai")[0];
          fireEvent.click(backButton);

          // Assert: Should navigate to role-specific dashboard
          const expectedDashboard = roleToDashboard[role];
          expect(mockNavigate).toHaveBeenCalledWith(expectedDashboard);
          expect(mockNavigate).not.toHaveBeenCalledWith("/");

          // Cleanup
          unmount();
        },
      ),
      { numRuns: 20 }, // Run 20 test cases with different combinations
    );
  });
});
