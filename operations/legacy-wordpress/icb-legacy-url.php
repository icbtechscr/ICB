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
