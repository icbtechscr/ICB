<?php
/**
 * Plugin Name: ICB legacy site URL compatibility
 * Description: Keeps stored legacy links on the separate WordPress hostname without rewriting business data.
 */
if ( ! defined( 'ABSPATH' ) ) { exit; }
if ( ! defined( 'WP_HOME' ) || WP_HOME !== 'https://anterior.icbtechscr.com' ) { return; }

function icb_legacy_rewrite_urls( $value ) {
    if ( ! is_string( $value ) ) { return $value; }
    return preg_replace( '~(?:(?:https?:)?//)(?:www\.)?icbtechscr\.com(?=[:/\\?#\s"\'<>]|$)~i', 'https://anterior.icbtechscr.com', $value );
}
add_filter( 'wp_redirect', 'icb_legacy_rewrite_urls' );
add_filter( 'wp_get_attachment_url', 'icb_legacy_rewrite_urls' );
add_filter( 'upload_dir', function ( $uploads ) {
    foreach ( array( 'baseurl', 'url' ) as $key ) {
        if ( isset( $uploads[$key] ) ) { $uploads[$key] = icb_legacy_rewrite_urls( $uploads[$key] ); }
    }
    return $uploads;
} );
add_action( 'template_redirect', function () {
    if ( is_feed() || is_trackback() || is_robots() ) { return; }
    // Render-only translation also covers custom theme/footer links stored as absolute URLs.
    // Leave binary responses and non-HTML exports untouched.
    ob_start( function ( $body ) {
        $html = false;
        foreach ( headers_list() as $header ) {
            if ( stripos( $header, 'Content-Type:' ) === 0 ) {
                $html = stripos( $header, 'text/html' ) !== false;
            }
        }
        return $html ? icb_legacy_rewrite_urls( $body ) : $body;
    } );
}, -100 );

// Browsers may still hold a former permanent redirect to this archive hostname.
// Keep this site available, with an explicit route back to the current store.
add_action( 'wp_head', function () {
    echo '<style>body{padding-bottom:76px!important}.icb-legacy-notice{position:fixed;bottom:0;left:0;right:0;z-index:2147483000;background:#122849;color:#fff;padding:12px 18px;display:flex;gap:12px;align-items:center;justify-content:center;flex-wrap:wrap;font:15px/1.4 Arial,sans-serif;box-shadow:0 -2px 8px #0003}.icb-legacy-notice a{background:#fff;color:#122849!important;padding:7px 14px;border-radius:5px;font-weight:bold;text-decoration:none}</style>';
} );
add_action( 'wp_footer', function () {
    echo '<aside class="icb-legacy-notice" role="note" aria-label="Sitio anterior de ICB"><span>Estás en el sitio anterior de ICB.</span><a href="https://tienda.icbtechscr.com/">Abrir tienda actual</a></aside>';
} );
