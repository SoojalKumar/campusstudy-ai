VERCEL_ORIGIN = "https://campusstudy-ai-web.vercel.app"


def test_vercel_login_preflight_returns_cors_headers(client):
    response = client.options(
        "/api/v1/auth/login",
        headers={
            "Origin": VERCEL_ORIGIN,
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "content-type",
        },
    )

    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == VERCEL_ORIGIN
    assert "POST" in response.headers["access-control-allow-methods"]
