// Generate once; keep the private key server-side and retain the pair across deployments.
package main

import (
	"fmt"
	webpush "github.com/SherClockHolmes/webpush-go"
	"log"
)

func main() {
	private, public, err := webpush.GenerateVAPIDKeys()
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("VAPID_PUBLIC_KEY=%s\nVAPID_PRIVATE_KEY=%s\n", public, private)
}
